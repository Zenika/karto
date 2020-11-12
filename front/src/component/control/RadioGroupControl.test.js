import React from 'react';
import RadioGroupControl from './RadioGroupControl';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

describe('RadioGroupControl component', () => {

    it('displays provided options', () => {
        const options = ['option1', 'option2'];
        render(
            <RadioGroupControl options={options} value={options[0]} onChange={() => null}/>
        );

        expect(screen.queryAllByRole('radio')).toHaveLength(2);
        expect(screen.queryByText(options[0])).toBeInTheDocument();
        expect(screen.queryByText(options[1])).toBeInTheDocument();
    });

    it('calls change handler when option is selected', () => {
        const options = ['option1', 'option2'];
        const changeHandler = jest.fn();
        render(
            <RadioGroupControl options={options} value={options[0]} onChange={changeHandler}/>
        );

        const option = screen.getAllByRole('radio')[1];
        fireEvent.click(option);

        expect(changeHandler).toHaveBeenCalledTimes(1);
        expect(changeHandler).toHaveBeenCalledWith(options[1]);
    });
});
