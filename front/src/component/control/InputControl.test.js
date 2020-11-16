import React from 'react';
import InputControl from './InputControl';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('InputControl component', () => {

    it('displays placeholder and value in input', () => {
        const placeholder = 'some placeholder';
        const value = 'some value';
        render(
            <InputControl name={''} checked={false} placeholder={placeholder} value={value} onChange={() => null}/>
        );

        const input = screen.getByPlaceholderText(placeholder);
        expect(input).toHaveAttribute('placeholder', placeholder);
        expect(input).toHaveAttribute('value', value);
    });

    it('calls change handler when text is typed', () => {
        const changeHandler = jest.fn();
        const placeholder = 'placeholder';
        render(
            <InputControl name={''} checked={false} placeholder={placeholder} value={''} onChange={changeHandler}/>
        );

        const newValue = 'newValue';
        const input = screen.getByPlaceholderText(placeholder);
        fireEvent.change(input, { target: { value: newValue } });

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith(newValue);
    });

    it('clears input when clear button is clicked', () => {
        const changeHandler = jest.fn();
        render(
            <InputControl name={''} checked={false} placeholder={''} value={'some value'} onChange={changeHandler}/>
        );

        fireEvent.click(screen.getByText('Clear'));

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith('');
    });
});
