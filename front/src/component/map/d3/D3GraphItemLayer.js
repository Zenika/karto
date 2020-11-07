import D3GraphLayer from './D3GraphLayer';
import { FONT_SIZE, FONT_SPACING } from './D3Constants';

export default class D3GraphItemLayer extends D3GraphLayer {

    attachTo(itemLayersContainer, labelLayersContainer) {
        this.itemSvgContainer = itemLayersContainer.append('g').attr('class', this.name);
        this.labelSvgContainer = labelLayersContainer.append('g').attr('class', `${this.name}-labels`);
    }

    updateElements(newElementHandler) {
        super.updateElements(newElementHandler);
        this.itemSvgContainer
            .selectAll(this.svgElement)
            .data(this.data, d => d.id)
            .join(enter => enter
                .append(this.svgElement)
                .call(d => this.svgElementAttributesApplier(d))
                .attr('class', item => item.highlighted ? 'item-highlight' : 'item')
                .call(newElementHandler)
            );
        this.labelSvgContainer
            .selectAll('text')
            .data(this.data, d => d.id)
            .join('text')
            .text(d => d.displayName)
            .attr('text-anchor', 'middle')
            .attr('class', 'label');
    }

    updateElementsPositionAndScale(zoomFactor) {
        super.updateElementsPositionAndScale(zoomFactor);
        this.itemSvgContainer
            .selectAll(this.svgElement)
            .attr('transform', d => {
                if (d.x != null || d.y != null) {
                    return `translate(${d.x},${d.y}) scale(${1 / zoomFactor})`;
                } else {
                    return `scale(${1 / zoomFactor})`;
                }
            });
        this.labelSvgContainer
            .selectAll('text')
            .attr('transform', d => {
                if (d.x != null || d.y != null) {
                    return `translate(${d.x},${d.y})`;
                }
            })
            .attr('font-size', FONT_SIZE / zoomFactor)
            .attr('letter-spacing', FONT_SPACING / zoomFactor)
            .attr('dy', -FONT_SIZE / zoomFactor);
    }
}
